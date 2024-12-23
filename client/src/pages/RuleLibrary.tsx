
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
</new_str>
