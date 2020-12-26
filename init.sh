echo "Initializing with '$1' '${@:2}'"

NAME=$1
DESCRIPTION=${@:2}

FILES=(
  './.github/ISSUE_TEMPLATES/bug-report.md',
  './.github/ISSUE_TEMPLATES/feature-request.md',
  './CONTRIBUTING.md',
  './package.json',
  './README.md'
)

for INPUT_FILE in ${FILES[@]}; do
  echo "$INPUT_FILE -> SYNC STATE"
  sed -i "s/ts.boilerplate.name/$NAME/g" $INPUT_FILE
  sed -i "s/ts.boilerplate.description/$DESCRIPTION/g" $INPUT_FILE
done

rm init.sh
