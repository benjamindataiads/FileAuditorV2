
<old_str>
          <Route path="/rule-library" component={RuleLibrary} />
          <Route path="/create-rule" component={CreateRule} />
          <Route path="/audit/:id" component={AuditResults} />
</old_str>
<new_str>
          <Route path="/rule-library" component={RuleLibrary} />
          <Route path="/create-rule" component={CreateRule} />
          <Route path="/rule-edit" component={EditRule} />
          <Route path="/audit/:id" component={AuditResults} />
</new_str>
