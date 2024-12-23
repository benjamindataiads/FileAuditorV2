
<old_str>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.localStorage.setItem('editRule', JSON.stringify(rule));
                          setLocation('/edit-rule');
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/rule-edit/${rule.id}`)}
                      >
                        Edit
                      </Button>
</old_str>
<new_str>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.localStorage.setItem('editRule', JSON.stringify(rule));
                          setLocation('/rule-edit');
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/rule-edit/${rule.id}`)}
                      >
                        Edit
                      </Button>
</new_str>
