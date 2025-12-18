r: i
	@npm run dev

f:
	@npx prettier . --write

l:
	@eslint ./src/ --fix

i:
	@npm i

b: i
	@npm run build
	@mkdir -p build
	@mv main.js build/main.js
	@cp manifest.json build/manifest.json
	@cp src/styles.css build/styles.css

c:
	@rm -fr node_modules build package-lock.json media main.js

pd:
	@git tag -d 0.1.3
	@git push origin :refs/tags/0.1.3

p:
	@git tag -a 0.1.3 -m "0.1.3"
	@git push origin 0.1.3
