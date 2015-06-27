BABEL = ./node_modules/.bin/babel
SRC = es6

all: node test

node:
#	@mkdir -p node/
	@for path in "$$SRC/*.js"; do \
		file=`basename $$path`; \
		$(BABEL) "$$SRC/$$file" > "$$file"; \
	done

test:
	npm test
