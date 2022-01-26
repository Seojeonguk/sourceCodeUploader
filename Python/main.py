import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
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

    def on_moved(self, event):
        pass

    def on_created(self, event):  # 파일, 디렉터리가 생성되면 실행
        pass

    def on_deleted(self, event):  # 파일, 디렉터리가 삭제되면 실행
        pass

    def on_modified(self, event):  # 파일, 디렉터리가 수정되면 실행
        if "BOJ" in event.src_path:
            problemNum = event.src_path[7:-4]

            if 4 <= len(problemNum) <= 5:
                if self.file.checkproblem(problemNum):
                    sourcecode = self.file.getsourcecode(event.src_path)
                    title, level, tags = self.solvedac.problemInfo(problemNum)

                    self.notion.addpage(problemNum, title,
                                        level, tags, sourcecode)

                    self.file.savedproblem(problemNum)
                    self.file.removefile(event.src_path)


if __name__ == "__main__":
    w = Target()
    w.run()
