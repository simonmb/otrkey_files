# otrkey files
This repository automates the process of collecting `.otrkey` and `.otr2` file names from public mirror sites.
It runs every 30 minutes using GitHub Actions and commits an updated `otrkey_files.csv` to the repository.
Each run also adds the cutlists newly uploaded to [cutlist.at](http://cutlist.at) to `cutlists.csv.gz`, so the file list shows how many cutlists exist for each recording.
I created a small website to allow people to search the csv file and get redirected to the mirrors: [https://simonmb.github.io/otrkey_files/](https://simonmb.github.io/otrkey_files/)

If you want to use the data in your own application just use: https://raw.githubusercontent.com/simonmb/otrkey_files/refs/heads/main/otrkey_files.zip?changing_token
