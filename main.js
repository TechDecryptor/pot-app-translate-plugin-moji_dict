// 添加共用的請求體參數
const COMMON_BODY = {
    "_SessionToken": "r:ad1b6feaeaa641af4bdf839f302a522d",
    "_ClientVersion": "js3.4.1",
    "_ApplicationId": "E62VyFVLMiW7kvbtVq3p",
    "g_os": "PCWeb",
    "g_ver": "v4.9.5.20241220",
    "_InstallationId": "1b2822a6-ede5-43e3-addb-00003642f992"
};

async function makeRequest(url, body, utils) {
    const { tauriFetch: fetch } = utils;
    const headers = {
        "Content-Type": "application/json;charset=UTF-8"
    };

    // 合併共用參數
    const finalBody = { ...COMMON_BODY, ...body };

    const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: {
            type: "Json",
            payload: finalBody
        }
    });

    if (!res.ok) {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }

    return res.data;
}

async function getTTS(targetId, utils) {
    const url = "https://api.mojidict.com/parse/functions/tts-fetch";
    const body = {
        "tarId": targetId,
        "tarType": 102,
        "voiceId": "f002"
    };

    const result = await makeRequest(url, body, utils);
    return result.result?.result?.url;
}

async function translate(text, from, to, options) {
    const url = "https://api.mojidict.com/parse/functions/union-api";
    const body = {
        "functions": [
            {
                "name": "search-all",
                "params": {
                    "text": text,
                    "types": [102, 106, 103],
                },
            },
        ]
    };

    const result = await makeRequest(url, body, options.utils);
    
    if (result.result?.results?.["search-all"]?.result) {
        let explanations = [];
        let pronunciations = [];
        const searchAllResult = result.result.results["search-all"].result;
        let firstWord = null;
        let detailsData = null;
        let audioUrl = null;
        let audioResponse = null;

        // 處理單詞
        if (searchAllResult.word?.searchResult) {
            explanations.push({ trait: "<単語>", explains: [""] });
            
            // 先獲取第一個單詞的詳細資訊
            firstWord = searchAllResult.word.searchResult[0];
            if (firstWord) {
                const title = `${firstWord.spell || firstWord.title} | ${firstWord.pron || ''} ${firstWord.accent || ''}`.trim();
                explanations.push({ 
                    trait: "", 
                    explains: [title, firstWord.excerpt],
                    hasAudio: true  // 標記此項有音頻
                });

                // 獲取釋義
                const targetId = firstWord.targetId;
                if (targetId) {
                    const detailsUrl = "https://api.mojidict.com/parse/functions/web-word-fetchLatest";
                    const detailsBody = {
                        "itemsJson": [
                            {
                                "objectId": targetId,
                                "lfd": 0
                            }
                        ]
                    };

                    try {
                        // 獲取詳細釋義
                        detailsData = await makeRequest(detailsUrl, detailsBody, options.utils);
                        
                        // 處理 104 部分的資料（釋義）
                        if (detailsData.result?.[104]) {
                            const meanings = detailsData.result[104];
                            const jaEntry = meanings.find(m => m.lang === "ja");
                            const zhEntry = meanings.find(m => m.lang === "zh-CN");
                            
                            explanations.push({ trait: "-釈義-", explains: [""] });
                            
                            if (zhEntry) {
                                explanations.push({ trait: "", explains: [`(中)${zhEntry.title}`] });
                            } else {
                                explanations.push({ trait: "", explains: ["(中)無中文释义"] });
                            }
                            if (jaEntry) {
                                explanations.push({ trait: "", explains: [`(日)${jaEntry.title}`] });
                            }
                            
                            explanations.push({ trait: "-釈義-", explains: [""] });
                        }

                        // 最後處理音頻
                        audioUrl = await getTTS(targetId, options.utils);
                        if (audioUrl) {
                            try {
                                const { fetch } = options.utils.http;
                                audioResponse = await fetch(audioUrl, {
                                    method: 'GET',
                                    responseType: 3,  // 使用數字 3 表示 Binary
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                    }
                                });

                                if (audioResponse.ok) {
                                    const audioData = audioResponse.data;
                                    if (audioData && audioData.length > 0) {
                                        pronunciations.push({
                                            region: "日本語",
                                            symbol: firstWord.pron || "",
                                            voice: audioData,
                                            title: title
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching audio:', error);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching details:', error);
                    }
                }
            }

            // 處理其餘單詞
            for (let i = 1; i < searchAllResult.word.searchResult.length; i++) {
                const word = searchAllResult.word.searchResult[i];
                const title = `${word.spell || word.title} | ${word.pron || ''} ${word.accent || ''}`.trim();
                explanations.push({ trait: "", explains: [title, word.excerpt] });
            }
            
            explanations.push({ trait: "", explains: [""] });
        }

        // 處理文法
        if (searchAllResult.grammar?.searchResult) {
            explanations.push({ trait: "<文法>", explains: [""] });
            for (let i of searchAllResult.grammar.searchResult) {
                const title = i.title;
                const explanation = i.excerpt.replace('[文法] ', '');
                explanations.push({ trait: "", explains: [title, explanation] });
            }
            explanations.push({ trait: "", explains: [""] });
        }

        // 處理例句
        if (searchAllResult.example?.searchResult) {
            explanations.push({ trait: "<例文>", explains: [""] });
            for (let i of searchAllResult.example.searchResult) {
                explanations.push({ trait: "", explains: [i.title, i.excerpt] });
            }
        }

        return { 
            explanations, 
            pronunciations,
            sentence: [],
            config: {
                audioIcon: "🔊",  // 可以自定義音頻圖標
                audioPosition: "after-title"  // 指定音頻按鈕位置
            }
        };
    } else {
        throw JSON.stringify(result);
    }
}

function formatResults(section, trait, formatFunc) {
    if (!section || !section.searchResult) return [];
    
    const formattedResults = formatFunc(section.searchResult);
    return [
        { trait, explains: formattedResults },
        { trait: "", explains: [""] } // 添加空行
    ];
}

function formatWordResults(wordResults) {
    return wordResults.map(item => ({
        trait: item.title,
        explains: [item.excerpt]
    }));
}

function formatGrammarResults(grammarResults) {
    return grammarResults.map(item => ({
        trait: item.title,
        explains: [item.excerpt.replace('[文法] ', '')]
    }));
}

function formatExampleResults(exampleResults) {
    return exampleResults.map(item => ({
        trait: item.title,
        explains: [item.excerpt]
    }));
}