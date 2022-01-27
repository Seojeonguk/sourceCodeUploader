import os


class File:
    def __init__(self):
        self.problempath = "./problem.txt"

    def checkproblem(self, problemNum):
        existing = True

        if os.path.exists(self.problempath):
            with open(self.problempath, "r") as file:
                problems = file.readline().split(' ')
                file.close()

        if problemNum in problems:
            existing = False

        return existing

    def getsourcecode(self, file_path):
        sourcecode = ''
        if(os.path.exists(file_path)):
            with open(file_path, 'r') as file:
                sourcecode = file.readlines()
                sourcecode = "\t".join(sourcecode)
                file.close()

        return sourcecode

    def savedproblem(self, problemNum):
        if os.path.exists(self.problempath):
            with open(self.problempath, "a") as file:
                file.write(f"{problemNum} ")
                file.close()

    def removefile(self, file_url):
        if os.path.exists(file_url):
            os.remove(file_url)
