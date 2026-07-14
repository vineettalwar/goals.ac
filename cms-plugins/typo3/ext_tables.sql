#
# Table structure for table 'tx_goalsac_nonces'
#
CREATE TABLE tx_goalsac_nonces (
    uid int(11) NOT NULL auto_increment,
    nonce varchar(64) DEFAULT '' NOT NULL,
    expires_at int(11) DEFAULT '0' NOT NULL,
    created_at int(11) DEFAULT '0' NOT NULL,
    PRIMARY KEY (uid),
    UNIQUE KEY nonce (nonce),
    KEY expires_at (expires_at)
);

#
# Table structure for table 'tx_goalsac_idempotency'
#
CREATE TABLE tx_goalsac_idempotency (
    uid int(11) NOT NULL auto_increment,
    key_hash varchar(32) DEFAULT '' NOT NULL,
    value mediumtext,
    created_at int(11) DEFAULT '0' NOT NULL,
    PRIMARY KEY (uid),
    UNIQUE KEY key_hash (key_hash),
    KEY created_at (created_at)
);
