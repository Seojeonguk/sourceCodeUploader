from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from . import helpers

@api_view(['POST'])
def githubUpload(request):
    # Verify request
    # Apply try exception
    problemInfo = helpers.getProblemInfo(request.data["problemId"], request.data["mime"])
    
    return Response(problemInfo,status=status.HTTP_201_CREATED)

