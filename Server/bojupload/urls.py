from django.urls import path
from . import views

urlpatterns = [
    path('github', views.githubUpload),
    path('notion', views.notionUpload),
    path('all', views.allUpload)
]
