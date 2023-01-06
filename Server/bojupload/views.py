from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from . import helpers


@api_view(['POST'])
def githubUpload(request):
    try:
        helpers.verifyGithubInfo(request.data)
        helpers.verifyProblemInfo(request.data)
        githubInfo = helpers.getGithubInfo(request.data)
        problemInfo = helpers.getProblemInfo(request.data)
        sha = helpers.getSHA(problemInfo, githubInfo)
        response = helpers.github(problemInfo, githubInfo, sha)
    except Exception as e:
        return Response(str(e), status=status.HTTP_400_BAD_REQUEST)
    return Response(response, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def notionUpload(request):
    try:
        helpers.verifyNotionInfo(request.data)
        helpers.verifyProblemInfo(request.data)
        notionInfo = helpers.getNotionInfo(request.data)
        problemInfo = helpers.getProblemInfo(request.data)
        response = helpers.notion(notionInfo, problemInfo)
    except Exception as e:
        return Response(str(e), status=status.HTTP_400_BAD_REQUEST)
    return Response(response, status=status.HTTP_201_CREATED)
