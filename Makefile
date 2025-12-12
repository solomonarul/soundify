f:
	@npx prettier . --write

l:
	@eslint ./src/

i:
	@npm i

r: i
	@npm run dev

b: i
	@npm run build
	@mkdir -p build
	@mv main.js build/main.js
	@cp manifest.json build/manifest.json
	@cp src/styles.css build/styles.css

c:
	@rm -r node_modules build package-lock.json

p:
	@git tag -a $(ARGS) -m "$(ARGS)"
	@git push origin $(ARGS)