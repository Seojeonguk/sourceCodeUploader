from notion.client import NotionClient
from dotenv import load_dotenv
import os


class Notion:
    def __init__(self):
        load_dotenv()
        client = NotionClient(token_v2=os.environ.get("token"))
        self.page = client.get_collection_view(os.environ.get("url"))
