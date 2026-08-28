CREATE TABLE registration_requests (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)   NOT NULL,
    email       VARCHAR(120)  NOT NULL,
    organization VARCHAR(200) NOT NULL,
    role        VARCHAR(50)   NOT NULL,
    message     VARCHAR(1000),
    status      VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    reviewed_by VARCHAR(50),
    reviewed_at TIMESTAMP,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reg_request_status ON registration_requests(status);
CREATE INDEX idx_reg_request_email ON registration_requests(email);
