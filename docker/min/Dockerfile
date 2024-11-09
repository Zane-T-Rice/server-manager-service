# I have found this useful as a dummy server for testing during development.
FROM alpine
RUN apk add bash
COPY ./start-min.sh /start-min.sh
ENTRYPOINT ["bash", "/start-min.sh"]
