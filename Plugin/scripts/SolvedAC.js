export default class SolvedAC {
  constructor() {
    this.SOLVEDAC_BASE_URL = "https://solved.ac/api/v3";
  }

  async getProblemInfo(problemId) {
    validate(
      problemId,
      "Invalid problem ID for requesting problem information."
    );

    const url = `${this.SOLVEDAC_BASE_URL}/problem/show?problemId=${problemId}`;
    const headers = {
      Accept: "application/json",
    };

    const response = await request(url, "GET", headers, undefined);
    const data = await response.json();
    const problemInfo = {
      problemId: data.problemId,
      level: data.level,
      title: data.titleKo,
      tags: data.tags,
    };

    return problemInfo;
  }
}

async function request(url, method, headers, body) {
  return await fetch(url, {
    method: method,
    headers: headers,
    body: body,
  });
}

function validate(value, msg) {
  if (isEmpty(value)) {
    throw new Error(`[SolvedAC] : ${msg}`);
  }
}

function isEmpty(value) {
  return (
    !value || (typeof value === "object" && Object.keys(value).length === 0)
  );
}
