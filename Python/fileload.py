class File:
  def __init__(self):
    pass
  
  # 저장된 소스코드 가져오기
  def getsourcecode(self,file_url):
    with open(file_url,'r') as file:
      sourcecode = file.readlines()
      # sourcecode = """{}""".format("".join(sourcecode[1:]))
      # print("""{}
      # """.format("".join(sourcecode[1:])))
      sourcecode = "".join(sourcecode).replace("    ","\t")
      file.close()
    
    return sourcecode
      
  # 맞은 문제 번호 가져오기
  def savedproblem(self,problemNum):
    with open("./problem.txt","a") as file:
      file.write(f"{problemNum} ")
      file.close()
      
  # 맞은 문제 속에 번호가 이미 들어있는지 확인(True:미존재,False:존재)
  def checkproblem(self,problemNum):
    with open("./problem.txt","r") as file:
      problems = file.readline().split(' ')
      file.close()

      ret = True
      res = "문제 목록에 존재하지 않습니다."
      if problemNum in problems:
        ret = False
        res = "문제 목록에 존재합니다."

      return ret