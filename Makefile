.PHONY: deploy

deploy:
	npm run build \
		&& aws s3 cp --recursive build s3://cloud.spyglass.fyi/playground \
		&& aws cloudfront create-invalidation --distribution-id E19JJJTD7LJK4H --paths "/playground/*"
