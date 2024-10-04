async function translate(text, from, to, options) {
    const { utils } = options;
    const { tauriFetch: fetch } = utils;

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
        ],
        "_ClientVersion": "js3.4.1",
        "_ApplicationId": "E62VyFVLMiW7kvbtVq3p",
        "g_os": "PCWeb",
        "g_ver": "v4.8.8.20240829",
        "_InstallationId": "1b2822a6-ede5-43e3-addb-00003642f992"
    };

    const headers = {
        "Content-Type": "application/json;charset=UTF-8"
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: {
            type: "Json",
            payload: body
        }
    });

    if (res.ok) {
        let result = res.data;
        if (result.result?.results?.["search-all"]?.result) {
            let explanations = [];
            const searchAllResult = result.result.results["search-all"].result;

            // 處理單詞
            if (searchAllResult.word?.searchResult) {
                explanations.push({ trait: "<単語>", explains: [""] });
                for (let i of searchAllResult.word.searchResult) {
                    explanations.push({ trait: "", explains: [i.title, i.excerpt] });
                }
                explanations.push({ trait: "", explains: [""] }); // 添加空行
            }

            // 處理文法
            if (searchAllResult.grammar?.searchResult) {
                explanations.push({ trait: "<文法>", explains: [""] });
                for (let i of searchAllResult.grammar.searchResult) {
                    explanations.push({ trait: "", explains: [i.title, i.excerpt.replace('[文法] ', '')] });
                }
                explanations.push({ trait: "", explains: [""] }); // 添加空行
            }

            // 處理例句
            if (searchAllResult.example?.searchResult) {
                explanations.push({ trait: "<例文>", explains: [""] });
                for (let i of searchAllResult.example.searchResult) {
                    explanations.push({ trait: "", explains: [i.title, i.excerpt] });
                }
            }

            return { explanations, sentence: [] };
        } else {
            throw JSON.stringify(result);
        }
    } else {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
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