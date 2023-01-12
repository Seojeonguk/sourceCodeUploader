from . import constants

import base64
import json
import requests

from notion_client import Client
from datetime import datetime


def getChildren(problemInfo):
    children = []
    children.append(setChildren(constants.BLOCK_TYPE_HEADING1, '풀이'))
    children.append(setChildren('paragraph', ''))
    children.append(setChildren(constants.BLOCK_TYPE_HEADING1, '소스코드'))
    children.append(setChildren('code', problemInfo))
    return children


def getEtx(ext):
    extension = {
        'text/x-csrc': constants.FILE_EXTENSION_C,
        'text/x-c++src': constants.FILE_EXTENSION_CPLUSCPLUS,
        'text/x-java': constants.FILE_EXTENSION_JAVA,
        'text/x-python': constants.FILE_EXTENSION_PYTHON,
        'text/plain': constants.FILE_EXTENSION_TEXT,
        'text/x-vb': constants.FILE_EXTENSION_VISUAL_BASIC
    }
    return extension.get(ext)


def getGithubInfo(requestData):
    githubInfo = {
        'token': requestData.get('githubToken'),
        'userName': requestData.get('githubUserName'),
        'repo': requestData.get('githubRepo'),
        'folderPath': requestData.get('githubFolderPath')
    }

    return githubInfo


def getLanguage(mime):
    language = {
        'text/x-csrc': constants.LANGUAGE_C,
        'text/x-c++src': constants.LANGUAGE_CPP,
        'text/x-java': constants.LANGUAGE_JAVA,
        'text/x-python': constants.LANGUAGE_PYTHON,
        'text/plain': constants.LANGUAGE_TEXT,
        'text/x-vb': constants.LANGUAGE_VISUAL_BASIC
    }
    return language.get(mime)


def getLevel(level):
    tier = ['Unrated']

    tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby']
    tierInfos = ['V', 'IV', 'III', 'II', 'I']

    for tierName in tierNames:
        for tierInfo in tierInfos:
            tier.append('%s %s' % (tierName, tierInfo))

    return tier[level]


def getNotionInfo(requestData):
    notionInfo = {
        'token': requestData.get('notionToken'),
        'databaseID': requestData.get('notionDatabaseId')
    }
    return notionInfo


def getParent(notionInfo):
    parent = {
        "type": "database_id",
        "database_id": notionInfo.get('databaseID')
    }
    return parent


def getProblemInfo(requestData):
    problemId = requestData.get('problemId')
    mime = requestData.get('mime')

    problemFullInfo = requestsolvedac(problemId)

    problemInfo = {
        'problemId': problemId,
        'title': problemFullInfo.get('titleKo'),
        'sourcecode': requestData.get('sourcecode'),
        'ext': getEtx(mime),
        'level': getLevel(problemFullInfo.get('level')),
        'tags': getTags(problemFullInfo.get('tags')),
        'language': getLanguage(mime)
    }

    return problemInfo


def getProperties(problemInfo):
    properties = {}

    properties['title'] = setProperty('title', problemInfo.get('title'))
    properties['info'] = setProperty(
        'multi_select', ["BOJ", problemInfo.get('level'), problemInfo.get('problemId')])
    properties['tags'] = setProperty('multi_select', problemInfo.get('tags'))
    properties['URL'] = setProperty(
        'url', '%s/problem/%s' % (constants.BOJ_BASE_URL, problemInfo.get('problemId')))
    properties['Date'] = setProperty('date')
    properties['mime'] = setProperty('select', 'c++')

    return properties


def getSHA(problemInfo, githubInfo):
    headers = {
        'Authorization': 'Bearer %s' % (githubInfo.get('token')),
        'Accept': 'application/vnd.github.v3+json'
    }

    path = '%s%s.%s' % (githubInfo.get('folderPath'),
                        problemInfo.get('problemId'), problemInfo.get('ext'))
    url = '%s/repos/%s/%s/contents/%s' % (constants.GITHUB_BASE_URL,
                                          githubInfo.get('userName'), githubInfo.get('repo'), path)

    res = requests.get(url=url, headers=headers)

    return res.json().get('sha')


def getTags(tagInfos):
    tags = []

    for tagInfo in tagInfos:
        tags.append(tagInfo.get('displayNames')[0].get('name'))

    return tags


def github(problemInfo, githubInfo, sha):
    headers = {
        'Authorization': 'Bearer %s' % (githubInfo.get('token')),
        'Accept': 'application/vnd.github.v3+json'
    }

    path = '%s%s.%s' % (githubInfo.get('folderPath'),
                        problemInfo.get('problemId'), problemInfo.get('ext'))
    url = '%s/repos/%s/%s/contents/%s' % (constants.GITHUB_BASE_URL,
                                          githubInfo.get('userName'), githubInfo.get('repo'), path)

    requestData = {
        "message": problemInfo.get('title'),
        "content": base64.b64encode(problemInfo.get('sourcecode').encode('ascii')).decode('utf8')
    }
    if not isEmpty(sha):
        requestData['sha'] = sha

    res = requests.put(url=url, headers=headers, data=json.dumps(requestData))

    if res.status_code == 422:
        return res.json().get('message')

    if res.status_code == 201 or res.status_code == 200:
        return res.json()['content']['html_url']


def isEmpty(o):
    if o == None or o == '':
        return True
    return False


def notion(notionInfo, problemInfo):
    nc = Client(auth=notionInfo.get('token'))

    body = setNotionBody(notionInfo, problemInfo)

    res = nc.pages.create(**body)

    return res.get('url')


def requestsolvedac(problemId):
    url = '%s/%s' % (constants.SOLVEDAC_BASE_URL,
                     constants.GETTING_PROBLEM_WITH_ID_URL)
    headers = {"Content-Type": "application/json"}
    params = {"problemId": problemId}

    response = requests.request("GET", url, headers=headers, params=params)

    return response.json()


def setChildren(type, value):
    children = {'type': type}

    if type == constants.BLOCK_TYPE_PARAGRAPH:
        children[constants.BLOCK_TYPE_PARAGRAPH] = {
            "rich_text": setRichText(value)
        }
    elif type == constants.BLOCK_TYPE_CODE:
        children[constants.BLOCK_TYPE_CODE] = {
            "rich_text": setRichText(value.get('sourcecode')),
            "language": value.get('language')
        }
    elif type == constants.BLOCK_TYPE_HEADING1:
        children[constants.BLOCK_TYPE_HEADING1] = {
            "rich_text": setRichText(value)
        }

    return children


def setNotionBody(notionInfo, problemInfo):
    body = {}

    body['parent'] = getParent(notionInfo)
    body['properties'] = getProperties(problemInfo)
    body['children'] = getChildren(problemInfo)

    return body


def setProperty(type, value=None):
    property = {}
    if type == constants.PROPERTY_TYPE_TITLE:
        property[constants.PROPERTY_TYPE_TITLE] = setRichText(value)
    elif type == constants.PROPERTY_TYPE_MULTI_SELECT:
        multiSelect = []
        for name in value:
            multiSelect.append({"name": name})
        property[constants.PROPERTY_TYPE_MULTI_SELECT] = multiSelect
    elif type == constants.PROPERTY_TYPE_DATE:
        property[constants.PROPERTY_TYPE_DATE] = {
            "start": datetime.now().strftime('%Y-%m-%d')
        }
    elif type == constants.PROPERTY_TYPE_URL:
        property[constants.PROPERTY_TYPE_URL] = value
    elif type == constants.PROPERTY_TYPE_SELECT:
        property[constants.PROPERTY_TYPE_SELECT] = {
            "name": value
        }

    return property


def setRichText(contents):
    richText = []
    subContents = contents
    while len(subContents) != 0:
        richText.append(
            {"type": "text", "text": {"content": subContents[:2000]}})
        subContents = subContents[2000:]

    return richText


def verifyGithubInfo(requestData):
    if isEmpty(requestData.get('githubToken')):
        raise Exception('Does not exist github token!')

    if isEmpty(requestData.get('githubUserName')):
        raise Exception('Does not exist github username!')

    if isEmpty(requestData.get('githubRepo')):
        raise Exception('Does not exist github repository!')

    if isEmpty(requestData.get('githubFolderPath')):
        raise Exception('Does not exist github folder path!')


def verifyNotionInfo(requestData):
    if isEmpty(requestData.get('notionToken')):
        raise Exception('Does not exist notion token!')

    if isEmpty(requestData.get('notionDatabaseId')):
        raise Exception('Does not exist notion database ID!')


def verifyProblemInfo(requestData):
    if isEmpty(requestData.get('problemId')):
        raise Exception('Does not exist problem ID!')

    if isEmpty(requestData.get('mime')):
        raise Exception('Does not exist mime!')

    if isEmpty(requestData.get('sourcecode')):
        raise Exception('Does not exist code!')
