from dotenv import load_dotenv
import os


class Github:
    def __init__(self):
        load_dotenv()
        self.githubToken = os.environ.get("github_token")
        self.githubOwner = os.environ.get("github_owner")
        self.githubRepo = os.environ.get("github_repo")
        self.githubApiUrl = "https://api.github.com"

        self.headers = {
            'Authorization': 'Bearer %s' % (self.githubToken),
            'Accept': 'application/vnd.github.v3+json'
        }
