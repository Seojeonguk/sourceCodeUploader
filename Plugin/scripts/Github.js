export default class Github {
  constructor() {
    this.GITHUB_BASE_URL = "https://github.com";
    this.GITHUB_API_BASE_URL = "https://api.github.com";
    this.CLIENT_ID = "2cfd0f1fae095d5a1684";
    this.CLIENT_SECRET = "d1b31e8c09708b856ecbe03d1f9e9223e472da89";
    this.REDIRECT_URL = "https://github.com";
    this.SCOPES = ["repo"];
  }

  async handleAction(action, payload, solvedAC) {
    try {
      if (action === "getAccessToken") {
        const code = payload?.code;

        const accessToken = await this.getAccessToken(code);
        this.getUserData(accessToken);
      } else if (action === "commit") {
        const res = await chrome.storage.local.get([
          "githubAccessToken",
          "githubID",
          "githubUploadedRepository",
        ]);

        const accessToken = res?.githubAccessToken;
        const githubID = res?.githubID;
        const uploadedRepository = res?.githubUploadedRepository;
        const problemId = payload?.problemId;
        const type = payload?.type;

        const problemInfo = await solvedAC.getProblemInfo(problemId);
        const sha = await this.existFile(
          accessToken,
          githubID,
          problemId,
          uploadedRepository,
          type
        );

        const sourceCode = payload?.sourceCode;

        const responseStatus = await this.commit(
          accessToken,
          githubID,
          sha,
          problemInfo,
          uploadedRepository,
          sourceCode,
          type
        );

        return responseStatus;
      } else if (action === "authentication") {
        this.getCode();
      } else if (action === "getRepositories") {
        const res = await chrome.storage.local.get(["githubAccessToken"]);

        const accessToken = res?.githubAccessToken;
        const repositories = await this.getRepositories(accessToken);
        return repositories;
      } else {
        throw new Error(`${action} is not supported!`);
      }
    } catch (e) {
      throw e;
    }
  }

  async existFile(accessToken, githubID, problemId, repository, type) {
    validate(accessToken, "Invalid access token to exist file.");
    validate(githubID, "Invalid github ID to exist file.");
    validate(problemId, "Invalid problem ID to get exist file.");
    validate(repository, "Invalid repository to get exist file.");

    const url = `${this.GITHUB_API_BASE_URL}/repos/${githubID}/${repository}/contents/${type}/${problemId}.java`;
    const headers = {
      accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await request(url, "GET", headers, undefined);
    const text = await response.text();
    const textJson = JSON.parse(text);

    return textJson.sha;
  }

  async commit(
    accessToken,
    githubID,
    sha,
    problemInfo,
    repository,
    sourceCode,
    type
  ) {
    validate(accessToken, "Invalid access token to commit.");
    validate(githubID, "Invalid github ID to commit.");
    validate(problemInfo, "Invalid problem information to get commit.");
    validate(repository, "Invalid repository to get commit.");

    const url = `${this.GITHUB_API_BASE_URL}/repos/${githubID}/${repository}/contents/${type}/${problemInfo.problemId}.java`;
    const headers = {
      accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
    };

    const body = JSON.stringify({
      message: problemInfo.title,
      content: btoa(sourceCode),
      sha: sha,
    });

    const response = await request(url, "PUT", headers, body);
    const responseStatus = response.status;

    return responseStatus;
  }

  async getUserData(accessToken) {
    validate(accessToken, "Invalid access token to get github id.");

    const url = `${this.GITHUB_API_BASE_URL}/user`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await request(url, "GET", headers, undefined);
    const json = await response.json();
    const githubID = json.login;

    chrome.storage.local.set({ githubID: githubID });
  }

  async getAccessToken(code) {
    validate(code, "Invalid code for requesting access token.");

    const url = `${this.GITHUB_BASE_URL}/login/oauth/access_token`;

    const data = new FormData();
    data.append("client_id", this.CLIENT_ID);
    data.append("client_secret", this.CLIENT_SECRET);
    data.append("code", code);

    const response = await request(url, "POST", undefined, data);
    const text = await response.text();
    const accessToken = text.match(/access_token=([^&]*)/)[1];

    chrome.storage.local.set({ githubAccessToken: accessToken });

    return accessToken;
  }

  async getCode() {
    let parameters = `client_id=${this.CLIENT_ID}`;
    if (this.REDIRECT_URL) {
      parameters += `&redirect_url=${this.REDIRECT_URL}`;
    }
    if (this.SCOPES) {
      parameters += `&scope=${this.SCOPES[0]}`;
    }
    const url = `${this.GITHUB_BASE_URL}/login/oauth/authorize?${parameters}`;

    chrome.tabs.create({ url: url });
  }

  async getRepositories(accessToken) {
    const url = `${this.GITHUB_API_BASE_URL}/user/repos?type=owner`;
    const headers = {
      accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await request(url, "GET", headers, undefined);
    const res = await response.json();

    return res;
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
    throw new Error(`[Github] : ${msg}`);
  }
}

function isEmpty(value) {
  return (
    !value || (typeof value === "object" && Object.keys(value).length === 0)
  );
}
