BABEL := ./node_modules/.bin/babel
SRC := es6
SPEC_SRC := spec
SPEC_DEST := test
ENTRY := bootloader.js

.PHONY: all node test clean

all: node test

node:
	$(BABEL) $(SRC)/$(ENTRY) > $(ENTRY)

test:
#	@mkdir -p $(SPEC_DEST)
#	@for path in "$(SPEC_SRC)/*.js"; do \
#		file=`basename $$path`; \
#		$(BABEL) "$(SPEC_SRC)/$$file" > "$(SPEC_DEST)/$$file"; \
#	done
	npm test

clean:
	@if [ -f $(ENTRY) ]; then \
	  rm $(ENTRY); \
	fi
	@if [ -d $(SPEC_DEST) ]; then \
	  rm -Rf $(SPEC_DEST); \
	fi

