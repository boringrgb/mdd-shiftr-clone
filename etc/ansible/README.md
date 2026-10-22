# Provisioning with this Ansible setup

## Using it
Copy the example and fill in your server’s details:

```
cp etc/ansible/inventory.example.ini etc/ansible/inventory.ini
```

If your OpenStack SSH key isn’t your default key, tell Ansible which one to use by adding it to the host line:
```
mdd-prod ansible_host=203.0.113.10 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/my-openstack-key
```

Check that Ansible can reach the server before running anything:
```
ansible all -i etc/ansible/inventory.ini -m ping
```

You should see "ping": "pong".
Run the playbook:
```
ansible-playbook -i etc/ansible/inventory.ini etc/ansible/playbook.yml
```

Add `--check --diff` for a dry run first. It won’t be fully accurate here, because later tasks depend on packages and users that earlier tasks would have created.

## User accound access

Each of tools, production and mqtt now accepts SSH logins with one specific public key. The playbook will stop at its first check until you create keys for tools and mqtt. The syntax check and ansible-lint pass, and I tested the key-file check locally. I haven’t run the playbook against a server.

How keys are assigned (ssh_public_keys in etc/ansible/playbook.yml):
||User|Key file on your workstation||
||production|
etc/keys/id_mdd_production_deploy.pub||
||tools|
etc/keys/id_mdd_tools.pub||
||mqtt|
etc/keys/id_mdd_mqtt.pub||

Each user gets exactly one key. The playbook writes `~/.ssh/authorized_keys` with that user’s key and nothing else. A key someone adds by hand will be removed on the next run.
Keys are checked first. The playbook checks that all three key files exist on your Mac before it changes anything on the server.
Locked passwords don’t block key logins. Ubuntu’s SSH server still accepts key logins for accounts with locked passwords, so no server settings change.
The keys stay out of git. `etc/keys/` is already in `.gitignore`.
To create the missing keys:
```
ssh-keygen -t ed25519 -f etc/keys/id_mdd_tools -C tools
ssh-keygen -t ed25519 -f etc/keys/id_mdd_mqtt -C mqtt
```
If you’d rather use other keys, change the paths in ssh_public_keys.
Bug fix in my earlier work: pointing each user’s docker command at their rootless daemon through ~/.bashrc would have broken your deploy.
Ubuntu’s .bashrc stops early for non-interactive shells, and the GitHub deploy runs over a non-interactive SSH session.
docker compose would have tried the root daemon and failed with “permission denied”.
Each user now uses Docker’s rootless context instead, which applies to every shell, including CI.
For the deploy: set the SSH_USER secret in your GitHub production environment to production. Also check that DEPLOY_PATH is somewhere that user owns, such as `/home/production/www`.
