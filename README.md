# otrkey files
This repository automates the process of collecting `.otrkey` file names from public mirror sites.
It runs every 30 minutes using GitHub Actions and commits an updated `otrkey_files.csv` to the repository.
I created a small website to allow people to search the csv file and get redirected to the mirrors: [https://simonmb.github.io/otrkey_files/](https://simonmb.github.io/otrkey_files/)

If you want to use the dat in your own application just use: https://raw.githubusercontent.com/simonmb/otrkey_files/main/otrkey_files.csv
