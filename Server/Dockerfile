FROM python:3

RUN mkdir /autopload

WORKDIR /autopload

COPY . .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

RUN python manage.py makemigrations
RUN python manage.py migrate

EXPOSE 8000

# ENTRYPOINT [ "python","manage.py","runserver" ]
CMD [ "gunicorn","--bind","0.0.0.0:8000","autoupload.wsgi:application" ]