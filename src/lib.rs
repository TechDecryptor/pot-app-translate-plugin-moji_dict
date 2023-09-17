use serde_json::{json, Value};
use std::collections::HashMap;
use std::error::Error;

#[no_mangle]
pub fn translate(
    text: &str,
    _from: &str,
    _to: &str,
    _needs: HashMap<String, String>,
) -> Result<Value, Box<dyn Error>> {
    let client = reqwest::blocking::ClientBuilder::new().build()?;
    const URL: &str = "https://api.mojidict.com/parse/functions/union-api";
    if text.split_whitespace().collect::<Vec<&str>>().len() > 1 {
        return Ok(Value::String("".to_string()));
    }
    let body = json!({
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
    });
    let res: Value = client
        .post(URL)
        .header("Content-Type", "application/json;charset=UTF-8")
        .json(&body)
        .send()?
        .json()?;

    fn parse_result(res: Value) -> Option<Value> {
        let mut explanations = Vec::new();
        let list = res
            .as_object()?
            .get("result")?
            .as_object()?
            .get("results")?
            .as_object()?
            .get("search-all")?
            .as_object()?
            .get("result")?
            .as_object()?
            .get("word")?
            .as_object()?
            .get("searchResult")?
            .as_array()?;
        for i in list {
            explanations.push(json!({"trait":"","explains":[i.as_object()?.get("title"),i.as_object()?.get("excerpt")]}))
        }
        Some(json!({"explanations":explanations}))
    }
    if let Some(result) = parse_result(res) {
        return Ok(result);
    } else {
        return Err("Response Parse Error".into());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn try_request() {
        let needs = HashMap::new();
        let result = translate("文具", "auto", "ja", needs).unwrap();
        println!("{result:?}");
    }
}
