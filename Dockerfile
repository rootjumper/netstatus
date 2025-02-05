FROM python:3.9-slim

WORKDIR /app

# Install necessary packages including route and SSH dependencies
RUN apt-get update && apt-get install -y net-tools openssh-client

COPY network.conf network.conf
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
