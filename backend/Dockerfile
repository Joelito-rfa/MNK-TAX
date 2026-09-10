FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd -r -s /bin/false appuser
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data
ENV JAVA_OPTS="-Xms256m -Xmx384m -XX:+UseG1GC -XX:+UseStringDeduplication"
USER appuser
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
