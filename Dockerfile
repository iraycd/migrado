FROM node:lts

WORKDIR /app
COPY . /app
RUN yarn install


## Add the wait script to the image
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.5.0/wait /wait
RUN chmod +x /wait

CMD /wait && yarn test --runInBand