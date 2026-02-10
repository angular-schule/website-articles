# CRITICAL: Git Submodule Warning

## DO NOT modify the `build/` folder directly!

The `build/` folder is a **git submodule** pointing to:
`git@github.com:angular-schule/website-articles-build.git`

### If you need to modify the build system:

1. Clone or navigate to the standalone repository:
   `git@github.com:angular-schule/website-articles-build.git`

2. Make your changes there

3. Commit and push from there

4. Then update the submodule reference in this repo if needed

### Why?

- Submodules are separate git repositories
- Changes made directly in `build/` will cause conflicts
- The submodule state is tracked by the parent repo
- Direct modifications mess up both repos

### Never do this:

```bash
cd build/
git checkout -b feature/xyz  # WRONG!
# editing files in build/    # WRONG!
git commit                   # WRONG!
```

### Always do this:

```bash
cd <your-path-to>/website-articles-build
git checkout -b feature/xyz  # CORRECT!
# edit files here            # CORRECT!
git commit                   # CORRECT!
```
