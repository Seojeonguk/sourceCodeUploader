import sys
import time
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from fileload import File

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
        
        file = File()
        file.checkproblem(problemNum)
      # if "BOJ" in event.src_path:
        # file = File()
        # file.savedproblem(event.src_path[7:-4])

if __name__ == "__main__":
  w = Target()
  w.run()
  