import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from file import File
from solvedac import Solvedac
from mynotion import Notion
from github import Github


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
        print(f'{event.src_path} 가 삭제되었습니다.')

    def on_modified(self, event):  # 파일, 디렉터리가 수정되면 실행
        if "BOJ" in event.src_path:
            if self.last_src != event.src_path:
                problemNum = event.src_path[7:-4]

                if 4 <= len(problemNum) <= 5:
                    if self.file.checkproblem(problemNum):
                        print(f'{problemNum} 번호를 저장하는 중입니다.')
                        try:
                            sourcecode = self.file.getsourcecode(
                                event.src_path)
                            title, level, tags = self.solvedac.problemInfo(
                                problemNum)

                            self.notion.addpage(
                                problemNum, title, level, tags, sourcecode)

                            self.file.savedproblem(problemNum)

                            self.github.create_file_contents(
                                problemNum, "C++", title, sourcecode)

                            print(f'{problemNum} 저장을 성공하였습니다.')
                        except:
                            print(f'{problemNum} 저장 중 오류가 발생하였습니다.')
                    else:
                        print(f'{problemNum} 이 이미 저장한 목록에 존재합니다.')
                else:
                    print(f'{problemNum} 의 이름을 확인해주세요.')

                self.last_src = event.src_path
            else:
                self.file.removefile(event.src_path)
                self.last_src = None


if __name__ == "__main__":
    w = Target()
    w.run()
