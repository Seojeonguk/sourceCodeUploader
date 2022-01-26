from notion.client import NotionClient
from dotenv import load_dotenv
import os
import datetime


class Notion:
    def __init__(self):
        load_dotenv()
        client = NotionClient(token_v2=os.environ.get("token"))
        self.page = client.get_collection_view(os.environ.get("url"))

    def addpage(self, problemNum, title, level, tags, sourcecode):
        newPage = self.page.collection.add_row()
        newPage.set_property('title', title)
        newPage.set_property('문제정보', ['BOJ', level, problemNum])
        newPage.set_property('태그', tags)
        newPage.set_property(
            'URL', f'https://www.acmicpc.net/problem/{problemNum}')
        newPage.set_property('Date', datetime.date.today())
        language = "C++"
        if "bits/stdc++.h" not in sourcecode:
            language = "Java"
        newPage.set_property('풀이', language)
