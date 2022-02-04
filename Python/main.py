import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from github import Github
from file import File
from solvedac import Solvedac
from mynotion import Notion


class Target:
    watchDir = "../"

    def __init__(self):
        self.observer = Observer()

    def run(self):
        event_handler = Handler()
        self.observer.schedule(event_handler, self.watchDir, recursive=True)
        self.observer.start()

        try:
            while True:
                time.sleep(10)
        except:
            self.observer.stop()
            print("Error")
            self.observer.join()


class Handler(FileSystemEventHandler):
    def __init__(self) -> None:
        super().__init__()
        self.file = File()
        self.solvedac = Solvedac()
        self.notion = Notion()
        self.github = Github()
        self.last_src = None

    def on_moved(self, event):
        pass

    def on_created(self, event):  # 파일, 디렉터리가 생성되면 실행
        pass

    def on_deleted(self, event):  # 파일, 디렉터리가 삭제되면 실행
        pass

    def on_modified(self, event):  # 파일, 디렉터리가 수정되면 실행
        if "BOJ" not in event.src_path:
            return

        if self.last_src == event.src_path:
            self.file.removeFile(event.src_path)
            self.last_src = None
            return

        problemNum = event.src_path[7:-4]

        if not 4 <= len(problemNum) <= 5:
            print(f'{problemNum} 파일명을 확인해주세요.')
            return

        if not self.file.checkProblem(problemNum):
            print(f'{problemNum}이 이미 저장한 목록에 추가되어 있습니다.')
            return

        notion_sourcecode, github_sourcecode = self.file.getSourcecode(
            event.src_path)
        if "bits/stdc++.h" in notion_sourcecode:
            language = "C++"
        elif "public class Main" in notion_sourcecode:
            language = "Java"
        else:
            language = "Python"

        title, level, tags = self.solvedac.problemInfo(problemNum)

        self.notion.addPage(problemNum, title, level,
                            tags, notion_sourcecode, language)

        self.file.savedProblem(problemNum)
        self.github.addProblem(
            problemNum, language, title, github_sourcecode)
        self.file.removeFile(event.src_path)


if __name__ == "__main__":
    w = Target()
    w.run()
