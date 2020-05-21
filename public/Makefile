HBS=../hbs
EXTRACT=../bin/extract.sh
TARBALL=course.tar.gz

pages.pdf: pages.html pages.css
	# prince --javascript --debug --pdf-profile="PDF/X-3:2002" $* -o $@
	prince --javascript --server --debug pages.html -o $@

pages.html: course/course.xml
	$(HBS) pages.hbs $(CURDIR)/course/course.xml $(UNITSFILTER) > $@

course/course.xml:
	rm -rf course
	$(EXTRACT) $(TARBALL) $(CURDIR)/$(@D)

pages.css:
	m4 --prefix-builtins --include . --debug $(addprefix --define=,$(M4OPTS)) pages.m4.css > $@

.PHONY: clean
clean:
	-rm -rf pages.html course pages.css pages.pdf

.FORCE: