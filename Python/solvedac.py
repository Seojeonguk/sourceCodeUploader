import requests

class Solvedac:
    levels = ['Unrated']
    level = ['브론즈','실버','골드','플래티넘','다이아몬드','루비']
    def __init__(self) -> None:
        self.url = "https://solved.ac/api/v3/problem/show"
        self.headers = {"Content-Type": "application/json"}

        for Lv in self.level:
            for idx in range(5,0,-1):
                self.levels.append(Lv+str(idx))

    def problemInfo(self,problemNum):
        querystring = {"problemId":problemNum}
        response = requests.request("GET", self.url, headers=self.headers, params=querystring)
        title = response.json()['titleKo']
        tags = []
        level = self.levels[response.json()['level']]

        for item in response.json()['tags']:
            tags.append(item['displayNames'][1]['name'])

        return title, level, tags

if __name__ == "__main__":
    solvedac = Solvedac()
    solvedac.problemInfo(5958)