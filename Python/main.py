import sys
import time
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from mynotion import Notion
from fileload import File
from solvedac import Solvedac

class Target:
  watchDir = "../"
  
  def __init__(self):
    self.observer = Observer()
    
  def run(self):
    event_handler=Handler()
    self.observer.schedule(event_handler, self.watchDir,recursive=True)
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
      self.notion = Notion()
      self.file = File()
      self.solvedac = Solvedac()
  def on_moved(self, event):
    pass
        # print(event)

  def on_created(self, event): #파일, 디렉터리가 생성되면 실행
    pass
      # print(event)

  def on_deleted(self, event): #파일, 디렉터리가 삭제되면 실행
    pass
      # print(event)

  def on_modified(self, event): #파일, 디렉터리가 수정되면 실행
      print(event)
      
      if "BOJ" in event.src_path:
        problemNum = event.src_path[7:-4]

        
        
        if self.file.checkproblem(problemNum):
          print(f"{problemNum} 파일을 맞춘 목록에 추가합니다.")
          
          title, level, tags = self.solvedac.problemInfo(problemNum)
          sourcecode = self.file.getsourcecode(event.src_path)

          self.file.savedproblem(problemNum)

          self.notion.addrow(problemNum,title,level,tags,sourcecode)

          self.file.removesourcecode(event.src_path)

if __name__ == "__main__":
  w = Target()
  w.run()
  