const ctrlDef = ['$fancyModal', function($fancyModal) {
    this.open = () => {
        $fancyModal.open({ templateUrl: '/partial/help-dialog '})
    };
}];

module.exports = {
    templateUrl: '/partial/help',
    controller: ctrlDef
};
