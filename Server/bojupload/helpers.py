from . import constants

import base64
import json
import requests

def getEtx(ext):
    extension = {
        'text/x-csrc' : constants.FILE_EXTENSION_C,
        'text/x-c++src' : constants.FILE_EXTENSION_CPLUSCPLUS,
        'text/x-java' : constants.FILE_EXTENSION_JAVA,
        'text/x-python' : constants.FILE_EXTENSION_PYTHON,
        'text/plain' : constants.FILE_EXTENSION_TEXT
    }
    return extension.get(ext)

def getGithubInfo(requestData):
    githubInfo = {
        'token' : requestData.get('githubToken'),
        'userName' : requestData.get('githubUserName'),
        'repo' : requestData.get('githubRepo'),
        'folderPath' : requestData.get('githubFolderPath')
    }

    return githubInfo

def getProblemInfo(requestData):
    problemId = requestData.get('problemId')
    mime = requestData.get('mime')

    problemFullInfo = requestsolvedac(problemId)

    problemInfo = {
        'problemId' : problemId,
        'title' : problemFullInfo.get('titleKo'),
        'sourcecode' : requestData.get('sourcecode'),
        'ext' : getEtx(mime)
    }

    return problemInfo

def github(problemInfo, githubInfo):
    # To check if a file exists before requesting
    # Get sha value if file exists
    headers = {
        'Authorization': 'Bearer %s' % (githubInfo.get('token')),
        'Accept': 'application/vnd.github.v3+json'
    }

    path = '%s%s.%s' % (githubInfo.get('folderPath'), problemInfo.get('problemId'), problemInfo.get('ext'))
    url = '%s/repos/%s/%s/contents/%s' % (constants.GITHUB_BASE_URL,
                                          githubInfo.get('userName'), githubInfo.get('repo'), path)

    requestData = {
        "message": problemInfo.get('title'),
        "content": base64.b64encode(problemInfo.get('sourcecode').encode('ascii')).decode('utf8')
    }

    res = requests.put(url=url, headers=headers, data=json.dumps(requestData))

    if res.status_code==422:
        return res.json().get('message')

    if res.status_code==201 or res.status_code==200:
        return res.json()['content']['html_url']

def isEmpty(o):
    if o == None or o == '':
        return True
    return False

def requestsolvedac(problemId):
    url = '%s/%s' % (constants.SOLVEDAC_BASE_URL, constants.GETTING_PROBLEM_WITH_ID_URL)
    headers = {"Content-Type" : "application/json"}
    params = {"problemId" : problemId}

    response = requests.request("GET", url, headers = headers, params = params)

    return response.json()

def verifyGithubInfo(requestData):
    if isEmpty(requestData.get('githubToken')):
        raise Exception('Does not exist github token!')
    
    if isEmpty(requestData.get('githubUserName')):
        raise Exception('Does not exist github username!')

    if isEmpty(requestData.get('githubRepo')):
        raise Exception('Does not exist github repository!')

    if isEmpty(requestData.get('githubFolderPath')):
        raise Exception('Does not exist github folder path!')

def verifyProblemInfo(requestData):
    if isEmpty(requestData.get('problemId')):
        raise Exception('Does not exist problem ID!')

    if isEmpty(requestData.get('mime')):
        raise Exception('Does not exist mime!')

    if isEmpty(requestData.get('sourcecode')):
        raise Exception('Does not exist code!')
