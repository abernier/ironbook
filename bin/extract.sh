#!/bin/sh

#
# Extract the course.tar.gz
#
# ⚠️ Depending on wether the archive comes from `md2oedx` or studio.ironhack.school, it will have a leading `course` folder
# Script here take this into account and avoid this problem: we search for `chapter/` folder and take the parent folder.
#
#   1. Rename /tmp/abcd uploaded file into /tmp/abcd.tar.gz
#   2. Extract it to /tmp/abcd/x
#   3. Find the `chapter/` parent dir and move it to /tmp/abcd/course
#   4. remove /tmp/abcd/x
#

tarballPath=$1 # /Users/abernier/Desktop/12345
dstdir=$2

tmpdir=`mktemp -d /tmp/ironbook.XXX`

mkdir -p $tmpdir && tar -xzvf ${tarballPath} -C $tmpdir && \
mkdir -p $dstdir && mv $(dirname $(find $tmpdir -type d -name chapter))/* $dstdir && \
rm -rf $tmpdir