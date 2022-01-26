import os


class File:
    def __init__(self):
        pass

    def checkproblem(self, problemNum):
        existing = True

        if os.path.exists("./problem.txt"):
            with open("./problem.txt", "r") as file:
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