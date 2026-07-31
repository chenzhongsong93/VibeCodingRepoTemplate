# Makefile — MultiStack
# 门禁命令封装（多栈条件合并，对应 lefthook.yml 各语言钩子）

.PHONY: lint test build run

lint:
	cargo clippy --all-targets -- -D warnings
	cargo fmt --check
	npm run lint
	@command -v golangci-lint >/dev/null && golangci-lint run . \
	  || (echo "[lint] golangci-lint 未安装，降级 gofmt+vet（非阻断）" && gofmt -l . && go vet ./...)
	mvn spotless:check checkstyle:check spotbugs:check

lint-fix:
	cargo fmt
	cargo clippy --all-targets --fix --allow-dirty --allow-staged

test:
	cargo test --workspace
	npm test
	go test ./...
	mvn test

build:
	cargo build --release
	npm run build
	go build -o bin/MultiStack .
	mvn package

run:
	cargo run
	npm run dev
	go run .
	mvn exec:java
