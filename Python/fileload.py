class File:
  def __init__(self):
    pass
  
  def fileopen(self,file_url):
    print("fileopen",file_url)
    if "BOJ" in file_url:
      with open(file_url,'r') as file:
        print("filereadline",file.readlines())
    else:
      print(f"File name does not include 'BOJ' : {file_url}")
      
  # 맞은 문제 번호 가져오기
  def savedproblem(self,problemNum):
    print(f"Saved problem : {problemNum}")
    with open("./problem.txt","a") as file:
      file.write(f"{problemNum} ")
      file.close()
      
  # 맞은 문제 속에 번호가 이미 들어있는지 확인
  def checkproblem(self,problemNum):
    print(f"Check Problem : {problemNum}")
    with open("./problem.txt","r") as file:
      problems = file.readline().split(' ')
      print(f"problems : {problems}")
      file.close()