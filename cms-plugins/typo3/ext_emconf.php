<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<extension xmlns="http://typo3.org/ns/TYPO3/CMS/Core/Resources/Private/Schemas/Extension.xsd">
  <key>goals_ac</key>
  <state>beta</state>
  <title>goals.ac Connector</title>
  <description>Receive AI-generated content from goals.ac via HMAC-authenticated REST endpoints.</description>
  <version>0.1.0</version>
  <constraints>
    <depends>
      <typo3 vers="11.5.0-13.4.99"/>
      <php vers="8.1.0-8.4.99"/>
    </depends>
  </constraints>
  <autoload>
    <psr-4 prefix="GoalsAc\\Typo3\\">Classes/</psr-4>
  </autoload>
</extension>
