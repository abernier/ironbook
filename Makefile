%/public:
	cp -rf public $@

%/public/pages.pdf: %/public %/public/pages.css %/public/pages.html
	# prince --javascript --debug --pdf-profile="PDF/X-3:2002" $* -o $@
	prince --javascript --server $*/public/pages.html -o $@

%/public/pages.html: %/public hbs
	./hbs $*/public/pages.hbs $*/course/course.xml > $@

%/public/pages.css: %/public
	m4 --prefix-builtins --include $*/public/ --debug $(addprefix --define=,$(M4OPTS)) $*/public/pages.m4.css > $@

.PHONY: clean
clean:
	-rm -rf tmp/*
	#$(MAKE) -C clean

.FORCE: