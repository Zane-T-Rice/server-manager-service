if [ "$(git diff --name-only --cached)" != "" ]; then 
  echo "Please do not push with files staged for commit."
  echo "You can probably push using \"git stash;git push;git stash pop\"."
  echo "Just be warned that those commands will move the staged files back to unstaged, which could merge them with local, unstaged changes that you have."
  exit 1;
fi