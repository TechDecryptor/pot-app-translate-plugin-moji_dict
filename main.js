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
                    "types": [102],
                },
            },
        ],
        "_ClientVersion": "js3.4.1",
        "_ApplicationId": "E62VyFVLMiW7kvbtVq3p",
        "g_os": "PCWeb",
        "g_ver": "v4.6.4.20230615",
        "_InstallationId": "1f7dbb56-9030-4f32-9645-0df69f86c591",
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
        if (result.result && result.result.results && result.result.results["search-all"] && result.result.results["search-all"].result && result.result.results["search-all"].result.word && result.result.results["search-all"].result.word.searchResult){
            let explanations = [];
            for (let i of result.result.results["search-all"].result.word.searchResult) {
                explanations.push({"trait":"","explains":[i.title, i.excerpt]});
            }
            return {explanations};
        }else{
            throw JSON.stringify(result);
        }
    } else {
        throw `Http Request Error\nHttp Status: ${res.status}\n${JSON.stringify(res.data)}`;
    }
}