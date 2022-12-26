from . import constants

import requests
import json
import base64

def requestsolvedac(problemId):
    url = '%s/%s' % (constants.SOLVEDAC_BASE_URL, constants.GETTING_PROBLEM_WITH_ID_URL)
    headers = {"Content-Type" : "application/json"}
    params = {"problemId" : problemId}

    response = requests.request("GET", url, headers = headers, params = params)

    return response.json()

def getProblemInfo(problemId, mime):
    problemInfo = requestsolvedac(problemId)

    title = problemInfo.get('titleKo')
    ext = getEtx(mime)

    ret = {
        'problemId' : problemId,
        'title' : title,
        'ext' : ext
    }

    # Replace with the following form
    # def test2():
    # return 'abc', 100, [0, 1, 2]
    # #a, b, c = test2()
    return ret

def getEtx(ext):
    extension = {
        'text/x-csrc' : constants.FILE_EXTENSION_C,
        'text/x-c++src' : constants.FILE_EXTENSION_CPLUSCPLUS,
        'text/x-java' : constants.FILE_EXTENSION_JAVA,
        'text/x-python' : constants.FILE_EXTENSION_PYTHON,
        'text/plain' : constants.FILE_EXTENSION_TEXT
    }
    return extension.get(ext)