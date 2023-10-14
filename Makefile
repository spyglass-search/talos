.PHONY: deploy

deploy:
	npm run build \
		&& aws s3 cp --recursive build s3://sightglass.ai/playground \
		&& aws cloudfront create-invalidation \
			--distribution-id E3H2CED7PPLXAD \
			--paths "/playground/*"
