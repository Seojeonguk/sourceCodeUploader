from notion.client import NotionClient
from dotenv import load_dotenv
from notion.block import TextBlock, CodeBlock, HeaderBlock
import os
import datetime


class Notion:
    def __init__(self):
        load_dotenv()
        client = NotionClient(token_v2=os.environ.get("notion_token"))
        self.page = client.get_collection_view(os.environ.get("notion_url"))

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

        self.addcontent(newPage, sourcecode, language)

    def addcontent(self, page, sourcecode, language):
        explanationHeader = page.children.add_new(HeaderBlock)
        explanationHeader.title = "풀이"

        emptyspace = page.children.add_new(TextBlock)

        codeHeader = page.children.add_new(HeaderBlock)
        codeHeader.title = "소스 코드"

        code = page.children.add_new(CodeBlock)
        code.language = language
        code.title = sourcecode
