# PostgreSQL Master-Slave Cluster on AWS with Pulumi

## Overview
This project provisions a PostgreSQL master-replica database cluster and application server on AWS using Pulumi (Python). It sets up the necessary network infrastructure, security groups, EC2 instances, a Network Load Balancer (NLB), and a Node.js app to test read/write routing and replication.

---

## Infrastructure Components

### EC2 Instances
- **master-0** – Primary database instance
- **replica-az-a-0** – Replica in AZ `ap-southeast-1a`
- **replica-az-b-0** – Replica in AZ `ap-southeast-1b`
- **app-server** – Hosts a Node.js application

### Networking
- VPC and subnets (1 per AZ)
- Internet Gateway + public subnets
- Route tables for routing outbound traffic
- Security groups for controlled access

### Load Balancer
- Internal **Network Load Balancer**
- One listener on port `5432` for read queries (routes to replicas)
- Health checks on PostgreSQL port

---

## Prerequisites
- Pulumi account and CLI installed
- AWS CLI configured (`aws configure`)
- Python 3.8+ and `venv`
- SSH key pair created with AWS: `db-cluster`

---

## Getting Started

### 1. Setup Project Directory
```bash
mkdir db-cluster-aws
cd db-cluster-aws
```

### 2. Create Python Virtual Environment
```bash
sudo apt update
sudo apt install python3.8-venv -y
python3 -m venv venv
source venv/bin/activate
```

### 3. Initialize Pulumi Project
```bash
pulumi new aws-python
```
- Choose `ap-southeast-1` as the region
- Complete prompts to create the project

### 4. Update `__main__.py`
Replace the contents with the provided infrastructure code.

---

## Provision Infrastructure

### 5. Create Key Pair for SSH Access
```bash
cd ~/.ssh/
aws ec2 create-key-pair --key-name db-cluster --output text --query 'KeyMaterial' > db-cluster.id_rsa
chmod 400 db-cluster.id_rsa
```

### 6. Deploy the Infrastructure
```bash
cd db-cluster-aws
pulumi up --yes
```
- This creates VPC, subnets, EC2s, NLB, and generates an `~/.ssh/config` file.

---

## SSH Access to Instances
```bash
ssh master-0
ssh replica-az-a-0
ssh replica-az-b-0
ssh app-server
```
Optionally, set hostnames on each server:
```bash
sudo hostnamectl set-hostname <hostname>
```

---

## Configure PostgreSQL Cluster

### On Master (`master-0`):
Edit `postgresql.conf`:
```bash
sudo vim /etc/postgresql/16/main/postgresql.conf
```
Add:
```
listen_addresses = '*'
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB
```

Edit `pg_hba.conf`:
```bash
sudo vim /etc/postgresql/16/main/pg_hba.conf
```
Add:
```
host replication replicator 10.0.1.20/32 md5
host replication replicator 10.0.2.20/32 md5
host all app_user 10.0.1.0/24 md5
host all app_user 10.0.2.0/24 md5
```

Create replication user:
```bash
sudo -u postgres psql
CREATE USER replicator WITH LOGIN REPLICATION PASSWORD 'db-cluster';
\q
```
Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

### On Replicas:
Stop and clean the data directory:
```bash
sudo systemctl stop postgresql
sudo rm -rf /var/lib/postgresql/16/main
sudo mkdir /var/lib/postgresql/16/main
sudo chown postgres:postgres /var/lib/postgresql/16/main
```

Edit `postgresql.conf` and `pg_hba.conf` accordingly.

Create base backup:
```bash
sudo -u postgres pg_basebackup -h 10.0.1.10 -D /var/lib/postgresql/16/main -U replicator -P -v -R -X stream -C -S replica_az_a_0
```

Start PostgreSQL:
```bash
sudo systemctl start postgresql
```

---

## Verify Replication

### On Replicas:
```bash
sudo -u postgres psql
SELECT pg_is_in_recovery();
\q
```

### On Master:
```bash
sudo -u postgres psql
SELECT client_addr, state FROM pg_stat_replication;
\q
```

---

## Deploy Node.js App

### On `app-server`:
```bash
git clone https://github.com/Konami33/db-cluster-app.git
cd db-cluster-app
npm install
```

Create `.env` file:
```env
NODE_ENV=production
PORT=3000
MASTER_DB_HOST=10.0.1.10
READ_REPLICA_HOST=<your-nlb-dns>
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=app_db
DB_PORT=5432
MAX_POOL_SIZE=20
IDLE_TIMEOUT=30000
```

Start the app:
```bash
npm start
```

---

## Test Endpoints

### Health:
- `GET /health`
- `GET /health/metrics`

### CRUD:
- `POST /data` → Write to master
- `GET /data` → Read from replicas
- `GET /data/:id`
- `PUT /data/:id`
- `DELETE /data/:id`

Use Postman or curl with the app server’s public IP.

---

## Clean Up
To destroy the entire infrastructure:
```bash
pulumi destroy --yes
```

---

## Conclusion
This project deploys a production-ready, highly available PostgreSQL master-replica architecture with a load-balanced read path, and integrates it with a real Node.js application for testing. Ideal for DevOps teams looking to automate database deployments with Pulumi on AWS.
